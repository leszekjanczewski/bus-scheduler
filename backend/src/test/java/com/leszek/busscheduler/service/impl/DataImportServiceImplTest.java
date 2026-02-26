package com.leszek.busscheduler.service.impl;

import com.leszek.busscheduler.domain.*;
import com.leszek.busscheduler.dto.*;
import com.leszek.busscheduler.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class DataImportServiceImplTest {

    @Autowired
    private DataImportServiceImpl dataImportService;

    @Autowired
    private BusLineRepository busLineRepository;

    @Autowired
    private BusStopRepository busStopRepository;

    @Autowired
    private RouteRepository routeRepository;

    @Autowired
    private RouteStopRepository routeStopRepository;

    @Autowired
    private TripRepository tripRepository;

    @Autowired
    private DepartureRepository departureRepository;

    @BeforeEach
    void setUp() {
        departureRepository.deleteAll();
        tripRepository.deleteAll();
        routeStopRepository.deleteAll();
        routeRepository.deleteAll();
        busLineRepository.deleteAll();
        busStopRepository.deleteAll();
    }

    @Test
    @DisplayName("Should import complete Bus Line data from DTO")
    void shouldImportCompleteBusLine() {
        // given
        ImportRouteStopDTO stop1 = ImportRouteStopDTO.builder()
                .stopName("Stop A")
                .city("City X")
                .sequence(1)
                .timeOffset(0)
                .build();
        ImportRouteStopDTO stop2 = ImportRouteStopDTO.builder()
                .stopName("Stop B")
                .city("City X")
                .sequence(2)
                .timeOffset(15)
                .build();

        ImportTripDTO trip1 = ImportTripDTO.builder()
                .calendarType("WORKDAYS")
                .startTimes(List.of("08:00", "09:00"))
                .build();

        ImportRouteDTO route1 = ImportRouteDTO.builder()
                .variantName("Main")
                .direction("City Center")
                .stops(List.of(stop1, stop2))
                .trips(List.of(trip1))
                .build();

        ImportBusLineDTO dto = ImportBusLineDTO.builder()
                .lineNumber("100")
                .operator("BusCorp")
                .routes(List.of(route1))
                .build();

        // when
        dataImportService.importBusLine(dto);

        // then
        List<BusLine> lines = busLineRepository.findAll();
        assertThat(lines).hasSize(1);
        assertThat(lines.get(0).getLineNumber()).isEqualTo("100");

        List<BusStop> stops = busStopRepository.findAll();
        assertThat(stops).hasSize(2);
        assertThat(stops).extracting(BusStop::getName).containsExactlyInAnyOrder("Stop A", "Stop B");

        List<Route> routes = routeRepository.findAll();
        assertThat(routes).hasSize(1);
        assertThat(routes.get(0).getVariantName()).isEqualTo("Main");

        List<RouteStop> routeStops = routeStopRepository.findAll();
        assertThat(routeStops).hasSize(2);

        List<Trip> trips = tripRepository.findAll();
        assertThat(trips).hasSize(2);

        List<Departure> departures = departureRepository.findAll();
        // 2 trips (each for one start time) * 2 stops = 4 departures
        assertThat(departures).hasSize(4);
        
        // Check departure times
        // Trip starts at 08:00
        // Stop A (offset 0) -> 08:00
        // Stop B (offset 15) -> 08:15
        // Trip starts at 09:00
        // Stop A (offset 0) -> 09:00
        // Stop B (offset 15) -> 09:15
        assertThat(departures).extracting(Departure::getDepartureTime)
                .containsExactlyInAnyOrder(
                        LocalTime.of(8, 0),
                        LocalTime.of(8, 15),
                        LocalTime.of(9, 0),
                        LocalTime.of(9, 15)
                );
    }

    @Test
    @DisplayName("Should reuse existing Bus Stop")
    void shouldReuseExistingBusStop() {
        // given
        busStopRepository.save(BusStop.builder().name("Existing Stop").city("City X").build());

        ImportRouteStopDTO stop1 = ImportRouteStopDTO.builder()
                .stopName("Existing Stop")
                .city("City X")
                .sequence(1)
                .timeOffset(0)
                .build();

        ImportRouteDTO route1 = ImportRouteDTO.builder()
                .variantName("V1")
                .direction("D1")
                .stops(List.of(stop1))
                .trips(List.of())
                .build();

        ImportBusLineDTO dto = ImportBusLineDTO.builder()
                .lineNumber("200")
                .operator("Op")
                .routes(List.of(route1))
                .build();

        // when
        dataImportService.importBusLine(dto);

        // then
        assertThat(busStopRepository.findAll()).hasSize(1);
    }

    @Test
    @DisplayName("Should be idempotent and update existing Bus Line")
    void shouldBeIdempotent() {
        // given
        ImportRouteStopDTO stop1 = ImportRouteStopDTO.builder()
                .stopName("Stop A")
                .city("City X")
                .sequence(1)
                .timeOffset(0)
                .build();
        ImportRouteDTO route1 = ImportRouteDTO.builder()
                .variantName("V1")
                .direction("D1")
                .stops(List.of(stop1))
                .trips(List.of())
                .build();
        ImportBusLineDTO dto = ImportBusLineDTO.builder()
                .lineNumber("300")
                .operator("Initial Op")
                .routes(List.of(route1))
                .build();

        dataImportService.importBusLine(dto);

        // update
        dto.setOperator("Updated Op");
        
        // when
        dataImportService.importBusLine(dto);

        // then
        List<BusLine> lines = busLineRepository.findAll();
        assertThat(lines).hasSize(1);
        assertThat(lines.get(0).getOperator()).isEqualTo("Updated Op");
        assertThat(routeRepository.findAll()).hasSize(1);
    }
}
