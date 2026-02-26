package com.leszek.busscheduler.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class RouteStopDTO {
    Long id;
    Long routeId;
    Long busStopId;
    Integer sequenceNumber;
    Integer timeOffsetMinutes;
}

