package com.leszek.busscheduler.controller;

import com.leszek.busscheduler.dto.StopDepartureDTO;
import java.time.LocalTime;
import org.springframework.format.annotation.DateTimeFormat;


import com.leszek.busscheduler.domain.BusStop;
import com.leszek.busscheduler.domain.Departure;
import com.leszek.busscheduler.domain.Trip;
import com.leszek.busscheduler.dto.DepartureDTO;
import com.leszek.busscheduler.repository.BusStopRepository;
import com.leszek.busscheduler.repository.DepartureRepository;
import com.leszek.busscheduler.repository.TripRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.Comparator;

@RestController
@RequestMapping("/api/v1/departures")
@RequiredArgsConstructor
public class DepartureController {

    private final DepartureRepository departureRepository;
    private final TripRepository tripRepository;
    private final BusStopRepository busStopRepository;

    @GetMapping
    public ResponseEntity<List<DepartureDTO>> getAllDepartures() {
        List<DepartureDTO> departures = departureRepository.findAll().stream()
                .map(this::convertToDto)
                .toList();
        return ResponseEntity.ok(departures);
    }

    @GetMapping("/{id}")
    public ResponseEntity<DepartureDTO> getDepartureById(@PathVariable Long id) {
        return departureRepository.findById(id)
                .map(this::convertToDto)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<DepartureDTO> createDeparture(@RequestBody DepartureDTO departureDTO) {
        Optional<Trip> trip = tripRepository.findById(departureDTO.getTripId());
        Optional<BusStop> busStop = busStopRepository.findById(departureDTO.getBusStopId());

        if (trip.isEmpty() || busStop.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        Departure departure = Departure.builder()
                .departureTime(departureDTO.getDepartureTime())
                .trip(trip.get())
                .busStop(busStop.get())
                .build();

        Departure savedDeparture = departureRepository.save(departure);
        return new ResponseEntity<>(convertToDto(savedDeparture), HttpStatus.CREATED);
    }

    private DepartureDTO convertToDto(Departure departure) {
        return DepartureDTO.builder()
                .id(departure.getId())
                .departureTime(departure.getDepartureTime())
                .tripId(departure.getTrip().getId())
                .busStopId(departure.getBusStop().getId())
                .build();
    }    @GetMapping("/stop/{stopId}")
    public ResponseEntity<List<StopDepartureDTO>> getDeparturesByStop(
            @PathVariable Long stopId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.TIME) LocalTime time) {
        
        LocalTime searchTime = (time != null) ? time : LocalTime.now();
        
        // Najpierw pobieramy nazwę wybranego przystanku
        BusStop stop = busStopRepository.findById(stopId)
                .orElseThrow(() -> new IllegalArgumentException("Stop not found"));
        
        // Szukamy wszystkich odjazdów z przystanków o tej samej nazwie
        // To łączy przystanki o różnych ID (stare/nowe po edycji)
        List<StopDepartureDTO> departures = departureRepository.findAll().stream()
                .filter(d -> d.getBusStop().getName().equals(stop.getName()))
                .filter(d -> !d.getDepartureTime().isBefore(searchTime))
                .map(d -> StopDepartureDTO.builder()
                        .lineName(d.getTrip().getRoute().getBusLine().getLineNumber())
                        .departureTime(d.getDepartureTime())
                        .direction(d.getTrip().getRoute().getDirection())
                        .build())
                .sorted(Comparator.comparing(StopDepartureDTO::getDepartureTime))
                .limit(10)
                .toList();
                
        return ResponseEntity.ok(departures);
    }
}