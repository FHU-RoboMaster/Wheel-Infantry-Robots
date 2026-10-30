/**
 * @file shoot_control.h
 * @brief 发射机构控制接口 (DR16 遥控器)
 */
#pragma once

#include "comp_cmd.h"
#include "pid_device.h"

/**
 * @brief 初始化发射机构总线与电机（须在 CAN Start 之前调用）
 * @return OK 成功；其他为错误码
 */
err_t shoot_control_init(void);

/**
 * @brief 初始化发射电机 PID 参数
 * @details 摩擦轮 M3508 单速度环；拨弹 M2006 速度位置双环
 */
void shoot_speed_pid_init(void);

/** 公共 PID 设备：0=左摩擦轮，1=右摩擦轮，2=拨弹；越界返回 NULL。
 *  控制前须完成 shoot_control_init 和 shoot_speed_pid_init。 */
pid_device_t* shoot_get_pid_device(uint8_t motor_index);

/**
 * @brief 兼容旧入口：仅 motor_id=2 的拨弹电机支持位置环（转子角度，度）。
 * @note 新调用方使用 pid_device_control_location(shoot_get_pid_device(2), ...)。
 */
void dj_motor_pid_control_location(uint8_t motor_id, float target_angle);

/**
 * @brief 发射模式控制主函数
 * @details 根据遥控器状态执行对应的发射控制逻辑
 */
void Shoot_Mode(void);
