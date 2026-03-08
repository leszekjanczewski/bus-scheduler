package com.leszek.busscheduler.controller;

import com.leszek.busscheduler.domain.*;
import com.leszek.busscheduler.dto.ImportBusLineDTO;
import com.leszek.busscheduler.repository.UserRepository;
import com.leszek.busscheduler.service.BusLineService;
import com.leszek.busscheduler.service.DataImportService;
import com.leszek.busscheduler.repository.BusStopRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminController {

    private final DataImportService dataImportService;
    private final BusLineService busLineService;
    private final BusStopRepository busStopRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @GetMapping("/test")
    public String adminTest() {
        return "Admin access granted";
    }

    @PostMapping("/import")
    public void importData(@RequestBody ImportBusLineDTO dto) {
        dataImportService.importBusLine(dto);
    }

    @GetMapping("/lines")
    public List<BusLine> getAllLines() {
        return busLineService.findAllWithRoutes();
    }

    @PutMapping("/lines/{id}")
    public ResponseEntity<BusLine> updateLine(@PathVariable Long id, @RequestBody BusLine updatedLine) {
        return busLineService.findById(id)
                .map(existing -> {
                    existing.setLineNumber(updatedLine.getLineNumber());
                    existing.setOperator(updatedLine.getOperator());

                    if (updatedLine.getRoutes() != null && existing.getRoutes() != null) {
                        Map<Long, Route> updatedRoutesMap = updatedLine.getRoutes().stream()
                                .filter(r -> r.getId() != null)
                                .collect(Collectors.toMap(Route::getId, r -> r));

                        for (Route existingRoute : existing.getRoutes()) {
                            Route updatedRouteData = updatedRoutesMap.get(existingRoute.getId());
                            if (updatedRouteData != null) {
                                existingRoute.setVariantName(updatedRouteData.getVariantName());
                                existingRoute.setDirection(updatedRouteData.getDirection());

                                if (updatedRouteData.getRouteStops() != null && existingRoute.getRouteStops() != null) {
                                    Map<Long, RouteStop> updatedStopsMap = updatedRouteData.getRouteStops().stream()
                                            .filter(rs -> rs.getId() != null)
                                            .collect(Collectors.toMap(RouteStop::getId, rs -> rs));

                                    for (RouteStop existingStop : existingRoute.getRouteStops()) {
                                        RouteStop updatedStopData = updatedStopsMap.get(existingStop.getId());
                                        if (updatedStopData != null) {
                                            existingStop.setTimeOffsetMinutes(updatedStopData.getTimeOffsetMinutes());
                                            existingStop.setSequenceNumber(updatedStopData.getSequenceNumber());

                                            if (updatedStopData.getBusStop() != null &&
                                                !updatedStopData.getBusStop().getId().equals(existingStop.getBusStop().getId())) {
                                                busStopRepository.findById(updatedStopData.getBusStop().getId())
                                                    .ifPresent(existingStop::setBusStop);
                                            }
                                        }
                                    }
                                }

                                // Trip sync
                                if (updatedRouteData.getTrips() != null) {
                                    if (existingRoute.getTrips() == null) {
                                        existingRoute.setTrips(new HashSet<>());
                                    }
                                    Set<Trip> existingTrips = existingRoute.getTrips();

                                    Map<Long, Trip> existingTripsById = existingTrips.stream()
                                            .filter(t -> t.getId() != null)
                                            .collect(Collectors.toMap(Trip::getId, t -> t));

                                    Set<Long> incomingTripIds = updatedRouteData.getTrips().stream()
                                            .filter(t -> t.getId() != null)
                                            .map(Trip::getId)
                                            .collect(Collectors.toSet());

                                    existingTrips.removeIf(t -> t.getId() != null && !incomingTripIds.contains(t.getId()));

                                    for (Trip incomingTrip : updatedRouteData.getTrips()) {
                                        if (incomingTrip.getId() != null && existingTripsById.containsKey(incomingTrip.getId())) {
                                            existingTripsById.get(incomingTrip.getId()).setCalendarType(incomingTrip.getCalendarType());
                                        } else if (incomingTrip.getId() == null) {
                                            Trip newTrip = new Trip();
                                            newTrip.setCalendarType(incomingTrip.getCalendarType());
                                            newTrip.setRoute(existingRoute);

                                            if (incomingTrip.getDepartures() != null) {
                                                Set<Departure> newDepartures = new HashSet<>();
                                                for (Departure incomingDep : incomingTrip.getDepartures()) {
                                                    if (incomingDep.getBusStop() != null && incomingDep.getBusStop().getId() != null) {
                                                        Optional<BusStop> busStopOpt = busStopRepository.findById(incomingDep.getBusStop().getId());
                                                        if (busStopOpt.isPresent()) {
                                                            Departure newDep = new Departure();
                                                            newDep.setDepartureTime(incomingDep.getDepartureTime());
                                                            newDep.setBusStop(busStopOpt.get());
                                                            newDep.setTrip(newTrip);
                                                            newDepartures.add(newDep);
                                                        }
                                                    }
                                                }
                                                newTrip.setDepartures(newDepartures);
                                            }
                                            existingTrips.add(newTrip);
                                        }
                                    }
                                }
                            }
                        }
                    }
                    return ResponseEntity.ok(busLineService.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/lines/{id}")
    public ResponseEntity<Void> deleteLine(@PathVariable Long id) {
        if (busLineService.deleteById(id)) return ResponseEntity.ok().build();
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/users")
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @PostMapping("/users")
    public ResponseEntity<?> createUser(@RequestBody User newUser) {
        if (userRepository.findByUsername(newUser.getUsername()).isPresent()) {
            return ResponseEntity.badRequest().body("Użytkownik już istnieje");
        }
        newUser.setPassword(passwordEncoder.encode(newUser.getPassword()));
        return ResponseEntity.ok(userRepository.save(newUser));
    }

    @PutMapping("/users/{id}/password")
    public ResponseEntity<?> changeUserPassword(@PathVariable UUID id, @RequestBody Map<String, String> payload) {
        String newPassword = payload.get("password");
        return userRepository.findById(id)
                .map(user -> {
                    user.setPassword(passwordEncoder.encode(newPassword));
                    userRepository.save(user);
                    return ResponseEntity.ok().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable UUID id) {
        userRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}