package com.leszek.busscheduler.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class TripDTO {
    Long id;
    Long routeId;
    String calendarType;
}

