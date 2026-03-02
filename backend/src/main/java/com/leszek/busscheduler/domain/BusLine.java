package com.leszek.busscheduler.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.BatchSize;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import lombok.*;
import java.util.Set;

@Entity
@Table(name = "bus_lines")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BusLine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String lineNumber;

    private String operator;

    @JsonManagedReference
    @OneToMany(mappedBy = "busLine", cascade = CascadeType.ALL, orphanRemoval = true)
    @BatchSize(size = 10)
    private Set<Route> routes;
}
