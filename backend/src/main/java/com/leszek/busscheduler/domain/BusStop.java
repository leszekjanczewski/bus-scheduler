package com.leszek.busscheduler.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "bus_stops")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BusStop {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;       // np. "Kłodawa Urząd Gminy"

    private String city;       // np. "Kłodawa"

    // Opcjonalnie: koordynaty GPS, jeśli planujemy mapę
    private Double latitude;
    private Double longitude;
    private String direction;
}

