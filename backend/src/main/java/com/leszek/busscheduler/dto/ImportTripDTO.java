package com.leszek.busscheduler.dto;

import lombok.*;
import java.time.LocalTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImportTripDTO {
    private String calendarType;
    private List<String> startTimes;
}
