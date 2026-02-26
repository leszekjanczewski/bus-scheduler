package com.leszek.busscheduler.dto;

import lombok.Builder;
import lombok.Value;
import java.time.LocalTime;

@Value
@Builder
public class DepartureDTO {
    Long id;
    Long tripId;
    Long busStopId;
    LocalTime departureTime;
}

