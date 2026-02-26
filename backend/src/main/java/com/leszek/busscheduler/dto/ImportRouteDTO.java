package com.leszek.busscheduler.dto;

import lombok.*;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImportRouteDTO {
    private String variantName;
    private String direction;
    private List<ImportRouteStopDTO> stops;
    private List<ImportTripDTO> trips;
}
