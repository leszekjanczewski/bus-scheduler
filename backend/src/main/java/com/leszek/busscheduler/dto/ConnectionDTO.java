package com.leszek.busscheduler.dto;

import java.time.LocalTime;

// Java 21 record for connection result
public record ConnectionDTO(
        String lineName,
        LocalTime departureTime,
        LocalTime arrivalTime,
        int durationMinutes,
        String direction
) {}
