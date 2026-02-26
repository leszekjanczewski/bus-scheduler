package com.leszek.busscheduler.dto;

import lombok.*;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImportBusLineDTO {
    private String lineNumber;
    private String operator;
    private List<ImportRouteDTO> routes;
}
