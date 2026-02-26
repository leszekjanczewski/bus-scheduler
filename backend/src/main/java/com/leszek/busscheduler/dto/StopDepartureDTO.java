package com.leszek.busscheduler.dto;

import lombok.Builder;
import lombok.Value;
import java.time.LocalTime;

@Value
@Builder
public class StopDepartureDTO {
    String lineName;
    LocalTime departureTime;
    String direction;
}
