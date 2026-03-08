package com.leszek.busscheduler.dto;

import java.time.LocalDate;
import java.time.LocalTime;

public record SearchRequest(
        Long fromId,
        Long toId,
        LocalTime time,
        LocalDate date
) {}
