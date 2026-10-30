#pragma once

#include <stdint.h>
#ifndef M_PI
#define M_PI 3.14159265358979323846f
#endif
#define jie_MI 3.141592f

#define GetAngleBetween360(a) ((a) - (360 * (int32_t)((a) / 360)))
#define GetAngleBetween180(angle)   \
  ((angle) > 180) ? ((angle) - 360) \
                  : (((angle) < -180) ? ((angle) + 360) : (angle))
#define TWO_PI (2.0f * M_PI)
#define Limit_Radian(angle)          \
  ((angle) > M_PI ? (angle) - TWO_PI \
                  : ((angle) < -M_PI ? (angle) + TWO_PI : (angle)))
#define YAW_ALIGN_ANGLE 0
// 无符号整数转换函数
int float_to_uint(float x_float, float x_min, float x_max, int bits);
float uint_to_float(int x_int, float x_min, float x_max, int bits);
