package com.leszek.busscheduler.service.impl;

import com.leszek.busscheduler.domain.BusLine;
import com.leszek.busscheduler.domain.BusStop;
import com.leszek.busscheduler.domain.Departure;
import com.leszek.busscheduler.domain.Route;
import com.leszek.busscheduler.dto.ConnectionDTO;
import com.leszek.busscheduler.dto.RouteDTO;
import com.leszek.busscheduler.dto.SearchRequest;
import com.leszek.busscheduler.repository.BusLineRepository;
import com.leszek.busscheduler.repository.BusStopRepository;
import com.leszek.busscheduler.repository.RouteRepository;
import com.leszek.busscheduler.repository.TripRepository;
import com.leszek.busscheduler.service.RouteService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class RouteServiceImpl implements RouteService {

    private final RouteRepository routeRepository;
    private final BusLineRepository busLineRepository;
    private final BusStopRepository busStopRepository; // Dodano
    private final TripRepository tripRepository;       // Dodano

    @Override
    @Transactional(readOnly = true)
    public List<Route> findAll() {
        return routeRepository.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Route> findById(Long id) {
        return routeRepository.findById(id);
    }

    @Override
    public Route createRoute(RouteDTO routeDTO) {
        BusLine busLine = busLineRepository.findById(routeDTO.getBusLineId())
                .orElseThrow(() -> new IllegalArgumentException("BusLine with id " + routeDTO.getBusLineId() + " not found"));

        Route route = Route.builder()
                .variantName(routeDTO.getVariantName())
                .direction(routeDTO.getDirection())
                .busLine(busLine)
                .build();

        return routeRepository.save(route);
    }

    @Override
    public Optional<Route> updateRoute(Long id, RouteDTO routeDTO) {
        return routeRepository.findById(id)
                .map(existingRoute -> {
                    if (routeDTO.getBusLineId() != null) {
                         BusLine busLine = busLineRepository.findById(routeDTO.getBusLineId())
                            .orElseThrow(() -> new IllegalArgumentException("BusLine with id " + routeDTO.getBusLineId() + " not found"));  
                         existingRoute.setBusLine(busLine);
                    }
                    if (routeDTO.getVariantName() != null) {
                        existingRoute.setVariantName(routeDTO.getVariantName());
                    }
                    if (routeDTO.getDirection() != null) {
                        existingRoute.setDirection(routeDTO.getDirection());
                    }
                    return existingRoute;
                });
    }

    @Override
    public void deleteRoute(Long id) {
        routeRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ConnectionDTO> findConnections(SearchRequest request) {
        // 1. Znajdź ID przystanków
        BusStop fromStop = busStopRepository.findById(request.fromId())
             .orElseThrow(() -> new IllegalArgumentException("Stop not found ID: " + request.fromId()));
        BusStop toStop = busStopRepository.findById(request.toId())
             .orElseThrow(() -> new IllegalArgumentException("Stop not found ID: " + request.toId()));

        // 2. Pobierz pary odjazdów
        // Używamy zoptymalizowanego zapytania w TripRepository
        List<Object[]> rawConnections = tripRepository.findConnections(fromStop.getId(), toStop.getId(), request.time());

                // 3. Mapuj na DTO
        return rawConnections.stream()
            .map(obj -> {
                Departure dFrom = (Departure) obj[0];
                Departure dTo = (Departure) obj[1];
                String direction = (String) obj[2];
                return new ConnectionDTO(
                    dFrom.getTrip().getRoute().getBusLine().getLineNumber(),
                    dFrom.getDepartureTime(),
                    dTo.getDepartureTime(),
                    (int) Duration.between(dFrom.getDepartureTime(), dTo.getDepartureTime()).toMinutes(),
                    direction
                );
            })
            .toList();
    }
}
