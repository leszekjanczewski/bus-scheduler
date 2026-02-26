package com.leszek.busscheduler.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImportRouteStopDTO {
    private String stopName;
    private String city;
    private Integer sequence;
    private Integer timeOffset;
}
