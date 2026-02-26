package com.leszek.busscheduler.domain;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import lombok.*;
import java.util.List;

@Entity
@Table(name = "trips")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Trip {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonBackReference
    @ManyToOne
    @JoinColumn(name = "route_id", nullable = false)
    private Route route;

    // Można tu dodać powiązanie z kalendarzem (Dni robocze/Soboty)
    // Na razie uproszczenie: string
    private String calendarType; // np. "WORKDAYS", "WEEKENDS", "HOLIDAYS"

    @JsonManagedReference
    @OneToMany(mappedBy = "trip", cascade = CascadeType.ALL)
    private List<Departure> departures;
}

