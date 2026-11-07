/**
 * @file chassis_control.c
 * @brief 麦克纳姆轮底盘控制实现
 */
#include "chassis_control.h"
#include "bsp_log.h"

#include <math.h>
#include <stdbool.h>

#include "bsp_can.h"
#include "can.h"
#include "chassis_dynamics.h"
#include "comp_utils.h"
#include "dj_motor_ctrl.h"
#include "dr16.h"
#include "pid_location.h"

/* DR16 task owns the decoded command and updates it periodically. */
extern DR16_t *dr16;

/* 底盘电机总线与实例 */
dj_motor_bus_t chassis_bus;
dj_motor_t chassis_motors[4];
static const uint8_t chassis_motor_ids[4] = {4U, 3U, 2U, 1U};

#if BSP_LOG_ENABLED
static const char *const chassis_wheel_names[4] = {"左前", "右前", "左后",
                                                   "右后"};
#endif

/* 速度环 PID 实例 */
static PIDInstance pid_speed[4];
static pid_device_t chassis_pid_devices[4];

static err_t chassis_bus_init_result;
static err_t chassis_init_result[4];

/* 底盘状态与目标速度 */
static chassis_control_state_t chassis_control_state_;
static float motor_target_speed[4];
static float torque_ff_current[4];

/** 在 VERIFY 停机前记录轮位和控制目标，仅在故障路径格式化浮点数。 */
static void chassis_log_motor_failure(uint8_t motor_index,
                                      const char *operation, err_t result,
                                      float target_rpm, float feedforward) {
#if BSP_LOG_ENABLED
  char target_text[32];
  char feedforward_text[32];
  LOG_FATAL(
      "底盘计算", "CAN2 %s失败 wheel=%s motor=%u err=%d rpm=%s ff=%s",
      operation, chassis_wheel_names[motor_index],
      (unsigned)chassis_motor_ids[motor_index], (int)result,
      Float2StrN(target_text, sizeof(target_text), target_rpm) >= 0
          ? target_text
          : "<invalid>",
      Float2StrN(feedforward_text, sizeof(feedforward_text), feedforward) >= 0
          ? feedforward_text
          : "<invalid>");
#else
  RM_UNUSED(motor_index);
  RM_UNUSED(operation);
  RM_UNUSED(result);
  RM_UNUSED(target_rpm);
  RM_UNUSED(feedforward);
#endif
}

/** 两种运动模式共用故障检查，保留实际错误码，每次仅执行一次控制调用。 */
static void chassis_apply_speed(uint8_t motor_index, const char *operation) {
  const float target_rpm = motor_target_speed[motor_index];
  const float feedforward = torque_ff_current[motor_index];
  const err_t result =
      isfinite(target_rpm) && isfinite(feedforward)
          ? pid_device_control_speed(&chassis_pid_devices[motor_index],
                                     target_rpm, feedforward)
          : ARG_ERR;
  if (result != OK) {
    chassis_log_motor_failure(motor_index, operation, result, target_rpm,
                              feedforward);
    VERIFY(result == OK);
  }
}

/**
 * @brief 初始化底盘 CAN 总线与四个 M3508 电机
 * @return OK 或错误码
 */
err_t chassis_control_init(void) {
  LOG_DEBUG("底盘计算", "开始初始化底盘 CAN 总线和电机");
  /* 获取 CAN2 的 BSP 对象（假设 CAN2 用于底盘） */
  ASSERT(CAN2 != NULL);
  BSP_CAN_t can_id = BSP_CAN_get_id(CAN2);
  if (can_id == BSP_CAN_ID_ERROR) {
    LOG_FATAL("底盘计算", "CAN2 查找BSP对象失败 err=%d", (int)NOT_FOUND);
    ASSERT(can_id != BSP_CAN_ID_ERROR);
    return NOT_FOUND;
  }

  STM32CAN_t *can2 = STM32CAN_GetInstance(can_id);
  if (can2 == NULL) {
    LOG_FATAL("底盘计算", "CAN2 获取控制块失败 err=%d", (int)PTR_NULL);
    ASSERT(can2 != NULL);
    return PTR_NULL;
  }

  /* 初始化底盘总线 */
  chassis_bus_init_result = dj_motor_bus_init(&chassis_bus, can2);
  if (chassis_bus_init_result != OK) {
    LOG_FATAL("底盘计算", "CAN2 总线初始化失败 err=%d",
              (int)chassis_bus_init_result);
    VERIFY(chassis_bus_init_result == OK);
    return chassis_bus_init_result;
  }

  /* 初始化四个 M3508 底盘电机（控制组 0x200）
   * 实车电机编号与轮位的对应关系：
   *   左前轮 FL = 4 号电机
   *   右前轮 FR = 3 号电机
   *   左后轮 RL = 2 号电机
   *   右后轮 RR = 1 号电机
   * reversed 参数根据实际机械安装方向设置 */
  chassis_init_result[0] = dj_motor_init(
      &chassis_motors[CHASSIS_MOTOR_FL], &chassis_bus, DJ_MOTOR_M3508,
      chassis_motor_ids[CHASSIS_MOTOR_FL], false); /* 左前轮 = 4 号 */
  if (chassis_init_result[0] != OK) {
    LOG_FATAL("底盘计算", "CAN2 电机初始化失败 wheel=左前 motor=4 err=%d",
              (int)chassis_init_result[0]);
    VERIFY(chassis_init_result[0] == OK);
    return chassis_init_result[0];
  }

  chassis_init_result[1] = dj_motor_init(
      &chassis_motors[CHASSIS_MOTOR_FR], &chassis_bus, DJ_MOTOR_M3508,
      chassis_motor_ids[CHASSIS_MOTOR_FR], false); /* 右前轮 = 3 号 */
  if (chassis_init_result[1] != OK) {
    LOG_FATAL("底盘计算", "CAN2 电机初始化失败 wheel=右前 motor=3 err=%d",
              (int)chassis_init_result[1]);
    VERIFY(chassis_init_result[1] == OK);
    return chassis_init_result[1];
  }

  chassis_init_result[2] = dj_motor_init(
      &chassis_motors[CHASSIS_MOTOR_RL], &chassis_bus, DJ_MOTOR_M3508,
      chassis_motor_ids[CHASSIS_MOTOR_RL], false); /* 左后轮 = 2 号 */
  if (chassis_init_result[2] != OK) {
    LOG_FATAL("底盘计算", "CAN2 电机初始化失败 wheel=左后 motor=2 err=%d",
              (int)chassis_init_result[2]);
    VERIFY(chassis_init_result[2] == OK);
    return chassis_init_result[2];
  }

  chassis_init_result[3] = dj_motor_init(
      &chassis_motors[CHASSIS_MOTOR_RR], &chassis_bus, DJ_MOTOR_M3508,
      chassis_motor_ids[CHASSIS_MOTOR_RR], false); /* 右后轮 = 1 号 */
  if (chassis_init_result[3] != OK) {
    LOG_FATAL("底盘计算", "CAN2 电机初始化失败 wheel=右后 motor=1 err=%d",
              (int)chassis_init_result[3]);
    VERIFY(chassis_init_result[3] == OK);
    return chassis_init_result[3];
  }

  LOG_DEBUG("底盘计算", "底盘 CAN 和四个电机初始化完成");
  return OK;
}

static void chassis_speed_pid_init_single(PIDInstance *pid, float kp, float ki,
                                          float kd, float max_out) {
  ASSERT(pid != NULL);
  ASSERT(isfinite(kp) && isfinite(ki) && isfinite(kd));
  ASSERT(max_out > 0.0f);
  PIDInit(pid, kp, ki, kd, max_out, 3000.0f, 0.0f,
          PID_Integral_Limit | PID_Derivative_On_Measurement |
              PID_OutputFilter | PID_DerivativeFilter,
          0.0f, 0.0f, 0.0002f, 0.0002f);
}

void chassis_speed_pid_init(void) {
  chassis_speed_pid_init_single(&pid_speed[CHASSIS_MOTOR_FL], 12.0f, 0.0f, 0.0f,
                                12000.0f);
  chassis_speed_pid_init_single(&pid_speed[CHASSIS_MOTOR_FR], 8.0f, 0.0f, 0.0f,
                                12000.0f);
  chassis_speed_pid_init_single(&pid_speed[CHASSIS_MOTOR_RL], 8.0f, 0.0f, 0.0f,
                                12000.0f);
  chassis_speed_pid_init_single(&pid_speed[CHASSIS_MOTOR_RR], 14.0f, 2.0f, 0.0f,
                                12000.0f);

  for (uint8_t i = 0; i < 4; ++i) {
    const err_t result =
        pid_device_init(&chassis_pid_devices[i], &chassis_motors[i],
                        PID_DEVICE_POSITIONAL, &pid_speed[i], NULL);
    if (result != OK) {
      LOG_FATAL("底盘计算", "CAN2 PID绑定失败 wheel=%s motor=%u err=%d",
                chassis_wheel_names[i], (unsigned)chassis_motor_ids[i],
                (int)result);
      VERIFY(result == OK);
    }
  }
  LOG_DEBUG("底盘计算", "四个底盘速度环 PID 初始化完成");
}

pid_device_t *chassis_get_pid_device(uint8_t motor_index) {
  return motor_index < 4 ? &chassis_pid_devices[motor_index] : NULL;
}

static void chassis_stop(void) {
  chassis_control_state_.command.vx = 0.0f;
  chassis_control_state_.command.vy = 0.0f;
  chassis_control_state_.command.wz = 0.0f;

  /* 使用 zero_and_flush 安全停机（推荐的停机方式） */
  const err_t result =
      dj_motor_zero_and_flush(&chassis_bus, DJ_MOTOR_GROUP_200);
  if (result != OK) {
    LOG_FATAL("底盘计算", "CAN2 发送停机零电流失败 group=0x200 err=%d",
              (int)result);
    VERIFY(result == OK);
  }
}

static void chassis_control(void) {
  if (dr16 == NULL) {
    LOG_FATAL("底盘计算", "正常模式遥控器对象为空 err=%d", (int)PTR_NULL);
  }
  ASSERT(dr16 != NULL);
  const cmd_rc_t *command = &dr16->dr16_cmd;
  if (!isfinite(command->ch.l.x) || !isfinite(command->ch.l.y) ||
      !isfinite(command->ch.r.x)) {
    LOG_FATAL(
        "底盘计算",
        "正常模式遥控输入非法 err=%d lx_finite=%u ly_finite=%u rx_finite=%u",
        (int)ARG_ERR, (unsigned)isfinite(command->ch.l.x),
        (unsigned)isfinite(command->ch.l.y),
        (unsigned)isfinite(command->ch.r.x));
  }
  ASSERT(isfinite(command->ch.l.x) && isfinite(command->ch.l.y) &&
         isfinite(command->ch.r.x));

  chassis_dynamics_feedforward(torque_ff_current);
  /*
   * 统一底盘坐标系：
   *   +X：前
   *   +Y：左
   *   +Z：上
   *   +wz：顺时针
   *
   * DR16 左摇杆：l.x / l.y
   *   注意：这里保留当前遥控器通道的实际方向反号，
   *   只把它统一映射到机器人底盘坐标系。
   */
  chassis_control_state_.command.vx = -command->ch.l.y * 3000.0f; // +X：前
  chassis_control_state_.command.vy = -command->ch.l.x * 3000.0f; // +Y：左
  chassis_control_state_.command.wz = command->ch.r.x * 3000.0f;  // +wz：顺时针

  /*
   * 麦克纳姆轮逆运动学：
   *   底盘坐标系：
   *       +X：前
   *       +Y：左
   *       +Z：上
   *       +wz：顺时针
   *
   *             前（+X）
   *                ↑
   *        4号 FL     3号 FR
   *        左前       右前
   *
   *        2号 RL     1号 RR
   *        左后       右后
   *
   *   输出数组顺序固定为 [FL, FR, RL, RR] = [4, 3, 2, 1]。
   */
  /* 麦克纳姆轮运动学解算 */
  chassis_dynamics_inverse(
      chassis_control_state_.command.vx, chassis_control_state_.command.vy,
      chassis_control_state_.command.wz, motor_target_speed);

  /* 执行速度环 PID 控制（写齐后自动发送 CAN 帧） */
  for (uint8_t i = 0; i < 4; i++) {
    chassis_apply_speed(i, "正常模式速度控制");
  }
}

/**
 * @brief 小陀螺模式
 *
 * 左拨杆 DOWN 时：
 *   - 左摇杆仍然有效：控制前后/左右平移
 *   - 右摇杆完全不参与底盘控制
 *   - 即使左摇杆回中，底盘仍保持固定 wz 原地旋转
 *
 * 因此：
 *   vx = 左摇杆前后
 *   vy = 左摇杆左右
 *   wz = 固定小陀螺速度
 */
static void chassis_small_gyro_control(void) {
  if (dr16 == NULL) {
    LOG_FATAL("底盘计算", "小陀螺模式遥控器对象为空 err=%d", (int)PTR_NULL);
  }
  ASSERT(dr16 != NULL);
  const cmd_rc_t *command = &dr16->dr16_cmd;
  if (!isfinite(command->ch.l.x) || !isfinite(command->ch.l.y)) {
    LOG_FATAL("底盘计算",
              "小陀螺模式遥控输入非法 err=%d lx_finite=%u ly_finite=%u",
              (int)ARG_ERR, (unsigned)isfinite(command->ch.l.x),
              (unsigned)isfinite(command->ch.l.y));
  }
  ASSERT(isfinite(command->ch.l.x) && isfinite(command->ch.l.y));

  chassis_dynamics_feedforward(torque_ff_current);

  /*
   * 左摇杆：
   *   l.y -> 前后移动 vx
   *   l.x -> 左右移动 vy
   *
   * 右摇杆：
   *   r.x 不读取，因此不会影响小陀螺旋转速度/方向。
   */
  chassis_control_state_.command.vx = -command->ch.l.y * 5000.0f;
  chassis_control_state_.command.vy = -command->ch.l.x * 5000.0f;

  /* 固定原地旋转速度：不动左摇杆时也会持续自转。 */
  chassis_control_state_.command.wz = 3000;

  chassis_dynamics_inverse(
      chassis_control_state_.command.vx, chassis_control_state_.command.vy,
      chassis_control_state_.command.wz, motor_target_speed);

  for (uint8_t i = 0; i < 4; i++) {
    chassis_apply_speed(i, "小陀螺模式速度控制");
  }
}

void Chassis_Mode(void) {
  static uint8_t last_mode = 0xFFU;
  uint8_t mode = 0U;
  /* 接收机掉线：底盘必须停止 */
  if ((dr16 == NULL) || !dr16->online_) {
    mode = 0U;
    if (mode != last_mode) {
      LOG_WARN("底盘计算", "遥控器%s，底盘进入停止模式",
               dr16 == NULL ? "对象为空" : "离线");
      last_mode = mode;
    }
    chassis_stop();
    return;
  }

  if (dr16->dr16_cmd.sw_l == CMD_SW_MID) {
    mode = 1U;
    if (mode != last_mode) {
      LOG_INFO("底盘计算", "进入正常底盘控制模式");
      last_mode = mode;
    }
    chassis_control();

  } else if (dr16->dr16_cmd.sw_l == CMD_SW_DOWN) {
    mode = 2U;
    if (mode != last_mode) {
      LOG_INFO("底盘计算", "进入小陀螺模式");
      last_mode = mode;
    }
    chassis_small_gyro_control();
  } else {
    mode = dr16->dr16_cmd.sw_l == CMD_SW_UP ? 3U : 4U;
    if (mode != last_mode) {
      if (dr16->dr16_cmd.sw_l == CMD_SW_UP) {
        LOG_INFO("底盘计算", "左拨杆处于 UP，底盘进入停止模式");
      } else {
        LOG_WARN("底盘计算", "左拨杆档位非法 sw_l=%u，底盘停止",
                 (unsigned)dr16->dr16_cmd.sw_l);
      }
      last_mode = mode;
    }
    /* UP 或异常状态：安全停止 */
    chassis_stop();
  }
}
