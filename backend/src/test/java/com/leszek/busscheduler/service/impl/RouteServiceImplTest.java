package com.leszek.busscheduler.service.impl;

import com.leszek.busscheduler.domain.*;
import com.leszek.busscheduler.dto.ConnectionDTO;
import com.leszek.busscheduler.dto.SearchRequest;
import com.leszek.busscheduler.repository.BusLineRepository;
import com.leszek.busscheduler.repository.BusStopRepository;
import com.leszek.busscheduler.repository.RouteRepository;
import com.leszek.busscheduler.repository.TripRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RouteServiceImplTest {

    @Mock
    private RouteRepository routeRepository;
    @Mock
    private BusLineRepository busLineRepository;
    @Mock
    private BusStopRepository busStopRepository;
    @Mock
    private TripRepository tripRepository;

    @InjectMocks
    private RouteServiceImpl routeService;

    @Test
    @DisplayName("Should find connections between two stops after a given time")
    void shouldFindConnections() {
        // given
        String fromStopName = "Stop A";
        String toStopName = "Stop B";
        LocalTime startTime = LocalTime.of(10, 0);
        SearchRequest request = new SearchRequest(fromStopName, toStopName, startTime);

        BusStop stopA = BusStop.builder().id(1L).name(fromStopName).build();
        BusStop stopB = BusStop.builder().id(2L).name(toStopName).build();

        BusLine line = BusLine.builder().lineNumber("241").build();
        Route route = Route.builder().busLine(line).build();
        Trip trip = Trip.builder().route(route).build();

        Departure depA = Departure.builder()
                .trip(trip)
                .busStop(stopA)
                .departureTime(LocalTime.of(10, 15))
                .build();

        Departure depB = Departure.builder()
                .trip(trip)
                .busStop(stopB)
                .departureTime(LocalTime.of(10, 45))
                .build();

        Object[] connectionRow = new Object[]{depA, depB};
        List<Object[]> mockResponse = Collections.singletonList(connectionRow);

        when(busStopRepository.findByName(fromStopName)).thenReturn(Optional.of(stopA));
        when(busStopRepository.findByName(toStopName)).thenReturn(Optional.of(stopB));
        when(tripRepository.findConnections(1L, 2L, startTime)).thenReturn(mockResponse);

        // when
        List<ConnectionDTO> results = routeService.findConnections(request);

        // then
        assertThat(results).hasSize(1);
        ConnectionDTO connection = results.get(0);
        assertThat(connection.lineName()).isEqualTo("241");
        assertThat(connection.departureTime()).isEqualTo(LocalTime.of(10, 15));
        assertThat(connection.arrivalTime()).isEqualTo(LocalTime.of(10, 45));
        assertThat(connection.durationMinutes()).isEqualTo(30);
    }
}
