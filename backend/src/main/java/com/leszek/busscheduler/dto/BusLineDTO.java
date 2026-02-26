package com.leszek.busscheduler.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class BusLineDTO {
    Long id;
    String lineNumber;
    String operator;
    // Można dodać np. List<RouteDTO> routes; w bardziej złożonym scenariuszu
}

