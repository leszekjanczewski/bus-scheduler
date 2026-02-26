package com.leszek.busscheduler.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.BatchSize;
import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import lombok.*;
import java.util.List;

@Entity
@Table(name = "routes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Route {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String variantName; // np. "A", "B", "Przez Różanki"
    private String direction;   // np. "Gorzów Wlkp."

    @JsonBackReference
    @ManyToOne
    @JoinColumn(name = "bus_line_id", nullable = false)
    private BusLine busLine;

    // Relacja do definicji kolejności przystanków na tej trasie
    @JsonManagedReference
    @OneToMany(mappedBy = "route", cascade = CascadeType.ALL)
    @BatchSize(size = 20)
    private List<RouteStop> routeStops;

    @JsonManagedReference
    @OneToMany(mappedBy = "route", cascade = CascadeType.ALL)
    @BatchSize(size = 10)
    private List<Trip> trips;
}

