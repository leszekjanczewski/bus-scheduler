package com.leszek.busscheduler.controller;

import com.leszek.busscheduler.domain.BusStop;
import com.leszek.busscheduler.dto.BusStopDTO;
import com.leszek.busscheduler.repository.BusStopRepository;
import com.leszek.busscheduler.repository.RouteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.Comparator;

@RestController
@RequestMapping("/api/v1/busstops")
@RequiredArgsConstructor
public class BusStopController {

    private final BusStopRepository busStopRepository;
    private final RouteRepository routeRepository;

    @GetMapping
    public ResponseEntity<List<BusStopDTO>> getAllBusStops() {
        List<BusStopDTO> busStops = busStopRepository.findAll().stream()
                .map(this::convertToDto)
                .toList();
        return ResponseEntity.ok(busStops);
    }

    @GetMapping("/{id}")
    public ResponseEntity<BusStopDTO> getBusStopById(@PathVariable Long id) {
        Optional<BusStopDTO> busStopDTO = busStopRepository.findById(id)
                .map(this::convertToDto);
        return busStopDTO.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<BusStopDTO> createBusStop(@RequestBody BusStopDTO busStopDTO) {
        BusStop busStop = convertToEntity(busStopDTO);
        BusStop savedBusStop = busStopRepository.save(busStop);
        return new ResponseEntity<>(convertToDto(savedBusStop), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<BusStopDTO> updateBusStop(@PathVariable Long id, @RequestBody BusStopDTO busStopDTO) {
        return busStopRepository.findById(id)
                .map(existingBusStop -> {
                    existingBusStop.setName(busStopDTO.getName());
                    existingBusStop.setCity(busStopDTO.getCity());
                    existingBusStop.setLatitude(busStopDTO.getLatitude());
                    existingBusStop.setLongitude(busStopDTO.getLongitude());
                    existingBusStop.setDirection(busStopDTO.getDirection());
                    BusStop updatedBusStop = busStopRepository.save(existingBusStop);
                    return ResponseEntity.ok(convertToDto(updatedBusStop));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBusStop(@PathVariable Long id) {
        if (busStopRepository.existsById(id)) {
            busStopRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        } else {
            return ResponseEntity.notFound().build();
        }
    }

            private BusStopDTO convertToDto(BusStop busStop) {
        List<String> finalDirections;
        if (busStop.getDirection() != null && !busStop.getDirection().isBlank()) {
            finalDirections = List.of(busStop.getDirection());
        } else {
            finalDirections = routeRepository.findDirectionsByBusStopId(busStop.getId());
        }
        
        return BusStopDTO.builder()
                .id(busStop.getId())
                .name(busStop.getName())
                .city(busStop.getCity())
                .latitude(busStop.getLatitude())
                .longitude(busStop.getLongitude())
                .direction(busStop.getDirection())
                .directions(finalDirections)
                .build();
    }

    private BusStop convertToEntity(BusStopDTO busStopDTO) {
        return BusStop.builder()
                .name(busStopDTO.getName())
                .city(busStopDTO.getCity())
                .latitude(busStopDTO.getLatitude())
                .longitude(busStopDTO.getLongitude())
                .direction(busStopDTO.getDirection())
                .build();
    }

    @GetMapping("/nearby")
    public ResponseEntity<List<BusStopDTO>> getNearbyStops(
            @RequestParam Double lat,
            @RequestParam Double lon) {
        // BoundingBox pre-filter (±0.02° ≈ ~2 km)
        double delta = 0.02;
        List<Object[]> rawResults = busStopRepository
                .findWithinBoundingBoxWithDirectionsNative(lat - delta, lat + delta, lon - delta, lon + delta);

        List<BusStopDTO> nearbyStops = rawResults.stream()
                .map(row -> {
                    Long id = ((Number) row[0]).longValue();
                    String name = (String) row[1];
                    String city = (String) row[2];
                    Double bLat = row[3] != null ? ((Number) row[3]).doubleValue() : null;
                    Double bLon = row[4] != null ? ((Number) row[4]).doubleValue() : null;
                    String direction = (String) row[5];
                    String directionsStr = (String) row[6];

                    List<String> directions = directionsStr != null 
                            ? List.of(directionsStr.split(";")) 
                            : List.of();

                    // If direction is not null/empty, we should prefer it as the only direction or add it
                    if (direction != null && !direction.isBlank() && directions.isEmpty()) {
                        directions = List.of(direction);
                    }

                    return BusStopDTO.builder()
                            .id(id)
                            .name(name)
                            .city(city)
                            .latitude(bLat)
                            .longitude(bLon)
                            .direction(direction)
                            .directions(directions)
                            .distance(haversineKm(lat, lon, bLat, bLon))
                            .build();
                })
                .sorted(Comparator.comparingDouble(BusStopDTO::getDistance))
                .limit(4)
                .toList();
        return ResponseEntity.ok(nearbyStops);
    }

    /** Haversine formula — returns distance in km */
    private double haversineKm(double lat1, double lon1, double lat2, double lon2) {
        final double R = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}