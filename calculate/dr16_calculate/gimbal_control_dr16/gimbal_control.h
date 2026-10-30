/**
 * @file gimbal_control.h
 * @brief 云台控制接口 (DR16 遥控器)
 */
#pragma once

#include "pid_device.h"

/** 初始化云台总线与电机（须在 CAN Start 之前调用）。 */
err_t gimbal_control_init(void);

/**
 * @brief 初始化云台电机速度环 PID 参数
 */
void gimbal_speed_pid_init(void);

/** 公共 PID 设备：0=YAW，1=PITCH；越界返回 NULL。
 *  控制前须完成 gimbal_control_init 和 gimbal_speed_pid_init。 */
pid_device_t* gimbal_get_pid_device(uint8_t motor_index);

/**
 * @brief 云台模式控制主函数
 * @details 根据遥控器状态执行对应的云台控制逻辑
 */
void Gimbal_Mode(void);
