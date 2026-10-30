/**
 * @file chassis_control.h
 * @brief 麦克纳姆轮底盘控制接口
 */
#pragma once

#include "comp_cmd.h"
#include "pid_device.h"

/** 底盘电机索引枚举 */
typedef enum {
  CHASSIS_MOTOR_FL = 0, /**< 左前轮 */
  CHASSIS_MOTOR_FR = 1, /**< 右前轮 */
  CHASSIS_MOTOR_RL = 2, /**< 左后轮 */
  CHASSIS_MOTOR_RR = 3  /**< 右后轮 */
} chassis_motor_index_e;

typedef struct {
  float vx;
  float vy;
  float wz;
} chassis_control_command_t;

typedef struct {
  chassis_control_command_t command;
  float command_limit;
  uint8_t enabled;
} chassis_control_state_t;

/**
 * @brief 初始化底盘总线与电机（须在 CAN Start 之前调用）
 * @return OK 成功；其他为错误码
 */
err_t chassis_control_init(void);

/**
 * @brief 初始化底盘电机速度 PID 参数
 */
void chassis_speed_pid_init(void);

/** 获取公共 PID 设备；索引见 chassis_motor_index_e，越界返回 NULL。
 *  控制前须完成 chassis_control_init 和 chassis_speed_pid_init。 */
pid_device_t* chassis_get_pid_device(uint8_t motor_index);

/**
 * @brief 底盘模式控制（周期调用）
 */
/** 底盘模式控制（周期调用）。左下档进入 DR16 小陀螺模式。 */
void Chassis_Mode(void);
