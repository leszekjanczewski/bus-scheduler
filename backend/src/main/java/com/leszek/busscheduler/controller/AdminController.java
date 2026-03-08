package com.leszek.busscheduler.controller;

import com.leszek.busscheduler.domain.*;
import com.leszek.busscheduler.dto.ImportBusLineDTO;
import com.leszek.busscheduler.repository.*;
import com.leszek.busscheduler.service.BusLineService;
import com.leszek.busscheduler.service.DataImportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalTime;
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
    private final TripRepository tripRepository;
    private final DepartureRepository departureRepository;
    private final RouteRepository routeRepository;

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

    @GetMapping("/lines/{id}/full")
    public ResponseEntity<BusLine> getLineFull(@PathVariable Long id) {
        return busLineService.findByIdWithFullDetails(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
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
                                            Trip existingTrip = existingTripsById.get(incomingTrip.getId());
                                            existingTrip.setCalendarType(incomingTrip.getCalendarType());
                                            // Update manually-edited departure times
                                            if (incomingTrip.getDepartures() != null && existingTrip.getDepartures() != null) {
                                                Map<Long, Departure> existingDepsById = existingTrip.getDepartures().stream()
                                                        .filter(d -> d.getId() != null)
                                                        .collect(Collectors.toMap(Departure::getId, d -> d));
                                                for (Departure incomingDep : incomingTrip.getDepartures()) {
                                                    if (incomingDep.getId() != null && existingDepsById.containsKey(incomingDep.getId())) {
                                                        existingDepsById.get(incomingDep.getId()).setDepartureTime(incomingDep.getDepartureTime());
                                                    }
                                                }
                                            }
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

    // ── Atomic trip/departure endpoints ────────────────────────────────────────

    @GetMapping("/routes/{id}/trips")
    public ResponseEntity<List<Trip>> getTripsByRoute(@PathVariable Long id) {
        return ResponseEntity.ok(tripRepository.findByRouteIdWithDepartures(id));
    }

    @PostMapping("/routes/{id}/trips")
    public ResponseEntity<Trip> addTrip(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return routeRepository.findByIdWithStops(id)
                .map(route -> {
                    LocalTime startTime = LocalTime.parse(body.get("startTime"));
                    String calendarType = body.get("calendarType");

                    Trip trip = new Trip();
                    trip.setRoute(route);
                    trip.setCalendarType(calendarType);

                    Set<Departure> departures = route.getRouteStops().stream()
                            .sorted(Comparator.comparing(RouteStop::getSequenceNumber))
                            .map(rs -> {
                                Departure d = new Departure();
                                d.setTrip(trip);
                                d.setBusStop(rs.getBusStop());
                                int offset = rs.getTimeOffsetMinutes() != null ? rs.getTimeOffsetMinutes() : 0;
                                d.setDepartureTime(startTime.plusMinutes(offset));
                                return d;
                            })
                            .collect(Collectors.toSet());
                    trip.setDepartures(departures);

                    return ResponseEntity.ok(tripRepository.save(trip));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/trips/{id}")
    public ResponseEntity<Void> deleteTrip(@PathVariable Long id) {
        if (!tripRepository.existsById(id)) return ResponseEntity.notFound().build();
        tripRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/trips/{id}/calendar")
    public ResponseEntity<Void> updateTripCalendar(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return tripRepository.findById(id)
                .map(trip -> {
                    trip.setCalendarType(body.get("calendarType"));
                    tripRepository.save(trip);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/departures/{id}")
    public ResponseEntity<Void> updateDepartureTime(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return departureRepository.findById(id)
                .map(dep -> {
                    dep.setDepartureTime(LocalTime.parse(body.get("departureTime")));
                    departureRepository.save(dep);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
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