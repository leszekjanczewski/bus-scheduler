package com.leszek.busscheduler.service.impl;

import com.leszek.busscheduler.domain.*;
import com.leszek.busscheduler.dto.ImportBusLineDTO;
import com.leszek.busscheduler.dto.ImportRouteDTO;
import com.leszek.busscheduler.dto.ImportRouteStopDTO;
import com.leszek.busscheduler.dto.ImportTripDTO;
import com.leszek.busscheduler.repository.*;
import com.leszek.busscheduler.service.DataImportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class DataImportServiceImpl implements DataImportService {

    private final BusLineRepository busLineRepository;
    private final BusStopRepository busStopRepository;
    private final RouteRepository routeRepository;
    private final RouteStopRepository routeStopRepository;
    private final TripRepository tripRepository;
    private final DepartureRepository departureRepository;

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("H:mm");

    @Override
    @Transactional
    public void importBusLine(ImportBusLineDTO dto) {
        log.info("Importing bus line: {}", dto.getLineNumber());

        BusLine busLine = getOrCreateBusLine(dto);

        // Usuwamy stare trasy dla tej linii (pełny update)
        // Ręczne usuwanie i odłączanie od linii, aby uniknąć problemów z sesją Hibernate
        List<Route> existingRoutes = routeRepository.findAllByBusLineId(busLine.getId());
        if (!existingRoutes.isEmpty()) {
            // Odłączamy trasy od linii przed ich usunięciem
            if (busLine.getRoutes() != null) {
                busLine.getRoutes().clear();
            }
            routeRepository.deleteAll(existingRoutes);
            routeRepository.flush();
        } else if (busLine.getRoutes() == null) {
            busLine.setRoutes(new ArrayList<>());
        }

        for (ImportRouteDTO routeDto : dto.getRoutes()) {
            saveRoute(busLine, routeDto);
        }
    }

    private BusLine getOrCreateBusLine(ImportBusLineDTO dto) {
        BusLine existingLine = busLineRepository.findByLineNumber(dto.getLineNumber());
        if (existingLine != null) {
            existingLine.setOperator(dto.getOperator());
            // Wymuszamy załadowanie kolekcji
            if (existingLine.getRoutes() != null) {
                existingLine.getRoutes().size();
            } else {
                existingLine.setRoutes(new ArrayList<>());
            }
            return existingLine;
        }
        return busLineRepository.save(BusLine.builder()
                .lineNumber(dto.getLineNumber())
                .operator(dto.getOperator())
                .routes(new ArrayList<>())
                .build());
    }

    private void saveRoute(BusLine busLine, ImportRouteDTO routeDto) {
        Route route = Route.builder()
                .variantName(routeDto.getVariantName())
                .direction(routeDto.getDirection())
                .busLine(busLine)
                .build();
        
        // Dodajemy do kolekcji w busLine - kaskada CascadeType.ALL zajmie się zapisem
        busLine.getRoutes().add(route);
        route = routeRepository.save(route);

        List<RouteStop> routeStops = new ArrayList<>();
        for (ImportRouteStopDTO stopDto : routeDto.getStops()) {
            BusStop busStop = getOrCreateBusStop(stopDto);
            RouteStop routeStop = RouteStop.builder()
                    .route(route)
                    .busStop(busStop)
                    .sequenceNumber(stopDto.getSequence())
                    .timeOffsetMinutes(stopDto.getTimeOffset())
                    .build();
            routeStops.add(routeStopRepository.save(routeStop));
        }

        for (ImportTripDTO tripDto : routeDto.getTrips()) {
            saveTrips(route, tripDto, routeStops);
        }
    }

    private BusStop getOrCreateBusStop(ImportRouteStopDTO stopDto) {
        return busStopRepository.findByNameAndCity(stopDto.getStopName(), stopDto.getCity())
                .orElseGet(() -> busStopRepository.save(BusStop.builder()
                        .name(stopDto.getStopName())
                        .city(stopDto.getCity())
                        .build()));
    }

    private void saveTrips(Route route, ImportTripDTO tripDto, List<RouteStop> routeStops) {
        for (String startTimeStr : tripDto.getStartTimes()) {
            try {
                LocalTime startTime = LocalTime.parse(startTimeStr, TIME_FORMATTER);
                Trip trip = Trip.builder()
                        .route(route)
                        .calendarType(tripDto.getCalendarType())
                        .build();
                trip = tripRepository.save(trip);

                // Zakładamy, że odjazdy są generowane dla wszystkich przystanków na podstawie startTime + offset
                for (RouteStop rs : routeStops) {
                    int offset = rs.getTimeOffsetMinutes() != null ? rs.getTimeOffsetMinutes() : 0;
                    Departure departure = Departure.builder()
                            .trip(trip)
                            .busStop(rs.getBusStop())
                            .departureTime(startTime.plusMinutes(offset))
                            .build();
                    departureRepository.save(departure);
                }
            } catch (DateTimeParseException e) {
                log.error("Failed to parse start time: {} for route: {}", startTimeStr, route.getVariantName());
                throw e; // Rzucamy dalej, aby wywołać rollback transakcji
            }
        }
    }
}
