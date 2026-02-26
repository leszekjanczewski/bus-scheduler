package com.leszek.busscheduler.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class RouteDTO {
    Long id;
    String variantName;
    String direction;
    Long busLineId;
}

