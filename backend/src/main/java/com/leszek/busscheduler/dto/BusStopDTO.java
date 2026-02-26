package com.leszek.busscheduler.dto;

import lombok.Builder;
import lombok.Value;
import java.util.List;

@Value
@Builder
public class BusStopDTO {
    Long id;
    String name;
    String city;
    Double latitude;
    Double longitude;
    String direction;
    Double distance;
    List<String> directions;
}
