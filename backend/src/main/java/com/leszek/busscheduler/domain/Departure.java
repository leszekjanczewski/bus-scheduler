package com.leszek.busscheduler.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalTime;
import com.fasterxml.jackson.annotation.JsonBackReference;

@Entity
@Table(name = "departures")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Departure {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonBackReference
    @ManyToOne
    @JoinColumn(name = "trip_id", nullable = false)
    private Trip trip;

    @ManyToOne
    @JoinColumn(name = "bus_stop_id", nullable = false)
    private BusStop busStop;

    @Column(nullable = false)
    private LocalTime departureTime;
}