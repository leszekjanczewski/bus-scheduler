package com.leszek.busscheduler.service.impl;

import com.leszek.busscheduler.domain.BusStop;
import com.leszek.busscheduler.domain.Departure;
import com.leszek.busscheduler.dto.ConnectionDTO;
import com.leszek.busscheduler.dto.SearchRequest;
import com.leszek.busscheduler.exception.StopNotFoundException;
import com.leszek.busscheduler.repository.BusStopRepository;
import com.leszek.busscheduler.repository.DepartureRepository;
import com.leszek.busscheduler.repository.RouteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BusSearchServiceImplTest {

    @Mock
    private BusStopRepository busStopRepository;

    @Mock
    private RouteRepository routeRepository;

    @Mock
    private DepartureRepository departureRepository;

    @InjectMocks
    private BusSearchServiceImpl service;

    private BusStop stopA;
    private BusStop stopB;

    @BeforeEach
    void setUp() {
        stopA = BusStop.builder().id(1L).name("A").build();
        stopB = BusStop.builder().id(2L).name("B").build();
    }

    // Helper implementation of the projection interface
    private static class DirectRouteInfoImpl implements RouteRepository.DirectRouteInfo {
        private final Long routeId;
        private final String lineNumber;
        private final Integer fromOffset;
        private final Integer toOffset;

        DirectRouteInfoImpl(Long routeId, String lineNumber, Integer fromOffset, Integer toOffset) {
            this.routeId = routeId;
            this.lineNumber = lineNumber;
            this.fromOffset = fromOffset;
            this.toOffset = toOffset;
        }

        @Override public Long getRouteId() { return routeId; }
        @Override public String getLineNumber() { return lineNumber; }
        @Override public Integer getFromOffset() { return fromOffset; }
        @Override public Integer getToOffset() { return toOffset; }
    }

    @Test
    void search_happyPath_directConnectionMappedAndSorted() {
        // given
        LocalTime fromTime = LocalTime.of(8, 0);
        SearchRequest request = new SearchRequest("A", "B", fromTime);

        when(busStopRepository.findByName("A")).thenReturn(Optional.of(stopA));
        when(busStopRepository.findByName("B")).thenReturn(Optional.of(stopB));

        RouteRepository.DirectRouteInfo info = new DirectRouteInfoImpl(100L, "10", 5, 20); // duration 15
        when(routeRepository.findDirectRoutes(1L, 2L)).thenReturn(List.of(info));

        Departure dep1 = Departure.builder().departureTime(LocalTime.of(8, 0)).build();
        Departure dep2 = Departure.builder().departureTime(LocalTime.of(9, 0)).build();
        when(departureRepository
                .findByTripRouteIdAndBusStopIdAndDepartureTimeGreaterThanEqualOrderByDepartureTimeAsc(100L, 1L, fromTime))
                .thenReturn(List.of(dep1, dep2));

        // when
        List<ConnectionDTO> result = service.search(request);

        // then
        assertEquals(2, result.size());
        // First connection
        assertEquals("10", result.get(0).lineName());
        assertEquals(LocalTime.of(8, 0), result.get(0).departureTime());
        assertEquals(LocalTime.of(8, 15), result.get(0).arrivalTime());
        assertEquals(15, result.get(0).durationMinutes());
        // Second connection
        assertEquals("10", result.get(1).lineName());
        assertEquals(LocalTime.of(9, 0), result.get(1).departureTime());
        assertEquals(LocalTime.of(9, 15), result.get(1).arrivalTime());
        assertEquals(15, result.get(1).durationMinutes());

        // Verify repository interactions
        verify(busStopRepository).findByName("A");
        verify(busStopRepository).findByName("B");
        verify(routeRepository).findDirectRoutes(1L, 2L);
        verify(departureRepository).findByTripRouteIdAndBusStopIdAndDepartureTimeGreaterThanEqualOrderByDepartureTimeAsc(100L, 1L, fromTime);
        verifyNoMoreInteractions(departureRepository);
    }

    @Test
    void search_wrongDirection_filteredOut_returnsEmpty() {
        // given
        LocalTime fromTime = LocalTime.of(8, 0);
        SearchRequest request = new SearchRequest("A", "B", fromTime);

        when(busStopRepository.findByName("A")).thenReturn(Optional.of(stopA));
        when(busStopRepository.findByName("B")).thenReturn(Optional.of(stopB));

        // Simulate a route where fromOffset > toOffset (wrong direction)
        RouteRepository.DirectRouteInfo info = new DirectRouteInfoImpl(100L, "10", 30, 10);
        when(routeRepository.findDirectRoutes(1L, 2L)).thenReturn(List.of(info));

        // when
        List<ConnectionDTO> result = service.search(request);

        // then
        assertTrue(result.isEmpty(), "Expected empty result for wrong direction route");
        // departure repository should not be called when duration negative
        verify(departureRepository, never()).findByTripRouteIdAndBusStopIdAndDepartureTimeGreaterThanEqualOrderByDepartureTimeAsc(anyLong(), anyLong(), any());
    }

    @Test
    void search_noRoute_returnsEmptyList() {
        // given
        LocalTime fromTime = LocalTime.of(8, 0);
        SearchRequest request = new SearchRequest("A", "B", fromTime);

        when(busStopRepository.findByName("A")).thenReturn(Optional.of(stopA));
        when(busStopRepository.findByName("B")).thenReturn(Optional.of(stopB));
        when(routeRepository.findDirectRoutes(1L, 2L)).thenReturn(List.of());

        // when
        List<ConnectionDTO> result = service.search(request);

        // then
        assertNotNull(result);
        assertTrue(result.isEmpty());
        verify(departureRepository, never()).findByTripRouteIdAndBusStopIdAndDepartureTimeGreaterThanEqualOrderByDepartureTimeAsc(anyLong(), anyLong(), any());
    }

    @Test
    void search_stopNotFound_fromStopMissing_throws() {
        // given
        SearchRequest request = new SearchRequest("Missing", "B", LocalTime.of(8, 0));
        when(busStopRepository.findByName("Missing")).thenReturn(Optional.empty());

        // when / then
        assertThrows(StopNotFoundException.class, () -> service.search(request));
        verify(busStopRepository).findByName("Missing");
        verify(busStopRepository, never()).findByName("B");
        verifyNoInteractions(routeRepository, departureRepository);
    }

    @Test
    void search_stopNotFound_toStopMissing_throws() {
        // given
        SearchRequest request = new SearchRequest("A", "Missing", LocalTime.of(8, 0));
        when(busStopRepository.findByName("A")).thenReturn(Optional.of(stopA));
        when(busStopRepository.findByName("Missing")).thenReturn(Optional.empty());

        // when / then
        assertThrows(StopNotFoundException.class, () -> service.search(request));
        verify(busStopRepository).findByName("A");
        verify(busStopRepository).findByName("Missing");
        verifyNoInteractions(routeRepository, departureRepository);
    }
}
