set(_app_sources
    ${CMAKE_CURRENT_LIST_DIR}/chassis/chassis_dynamics.c
    ${CMAKE_CURRENT_LIST_DIR}/gimbal/gimbal_dynamics.c
    ${CMAKE_CURRENT_LIST_DIR}/can_device/can_device.c
    ${CMAKE_CURRENT_LIST_DIR}/shoot/shoot_dynamics.c
    ${CMAKE_CURRENT_LIST_DIR}/pid_device/pid_device.c
)
target_sources(${PROJECT_NAME} PRIVATE ${_app_sources})
target_include_directories(${PROJECT_NAME} PRIVATE
    ${CMAKE_CURRENT_LIST_DIR}/chassis
    ${CMAKE_CURRENT_LIST_DIR}/gimbal
    ${CMAKE_CURRENT_LIST_DIR}/shoot
    ${CMAKE_CURRENT_LIST_DIR}/can_device
    ${CMAKE_CURRENT_LIST_DIR}/pid_device
)
