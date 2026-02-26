package com.leszek.busscheduler.controller;

import com.leszek.busscheduler.domain.Route;
import com.leszek.busscheduler.domain.Trip;
import com.leszek.busscheduler.dto.TripDTO;
import com.leszek.busscheduler.repository.RouteRepository;
import com.leszek.busscheduler.repository.TripRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/trips")
@RequiredArgsConstructor
public class TripController {

    private final TripRepository tripRepository;
    private final RouteRepository routeRepository;

    @GetMapping
    public ResponseEntity<List<TripDTO>> getAllTrips() {
        List<TripDTO> trips = tripRepository.findAll().stream()
                .map(this::convertToDto)
                .toList();
        return ResponseEntity.ok(trips);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TripDTO> getTripById(@PathVariable Long id) {
        return tripRepository.findById(id)
                .map(this::convertToDto)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<TripDTO> createTrip(@RequestBody TripDTO tripDTO) {
        Optional<Route> route = routeRepository.findById(tripDTO.getRouteId());
        if (route.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        Trip trip = Trip.builder()
                .calendarType(tripDTO.getCalendarType())
                .route(route.get())
                .build();

        Trip savedTrip = tripRepository.save(trip);
        return new ResponseEntity<>(convertToDto(savedTrip), HttpStatus.CREATED);
    }

    private TripDTO convertToDto(Trip trip) {
        return TripDTO.builder()
                .id(trip.getId())
                .calendarType(trip.getCalendarType())
                .routeId(trip.getRoute().getId())
                .build();
    }
}

