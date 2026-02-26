package com.leszek.busscheduler.service.impl;

import com.leszek.busscheduler.domain.Departure;
import com.leszek.busscheduler.domain.BusStop;
import com.leszek.busscheduler.dto.ConnectionDTO;
import com.leszek.busscheduler.dto.SearchRequest;
import com.leszek.busscheduler.exception.StopNotFoundException;
import com.leszek.busscheduler.repository.BusStopRepository;
import com.leszek.busscheduler.repository.TripRepository;
import com.leszek.busscheduler.service.BusSearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BusSearchServiceImpl implements BusSearchService {

    private final BusStopRepository busStopRepository;
    private final TripRepository tripRepository;

    @Override
    public List<ConnectionDTO> search(SearchRequest request) {
        busStopRepository.findById(request.fromId())
                .orElseThrow(() -> new StopNotFoundException("Stop not found ID: " + request.fromId()));
        busStopRepository.findById(request.toId())
                .orElseThrow(() -> new StopNotFoundException("Stop not found ID: " + request.toId()));

        List<Object[]> rawConnections = tripRepository.findConnections(request.fromId(), request.toId(), request.time());

        return rawConnections.stream()
                .map(obj -> {
                    Departure dFrom = (Departure) obj[0];
                    Departure dTo = (Departure) obj[1];
                    String direction = (String) obj[2];
                    
                    int duration = (int) Duration.between(dFrom.getDepartureTime(), dTo.getDepartureTime()).toMinutes();
                    
                    return new ConnectionDTO(
                            dFrom.getTrip().getRoute().getBusLine().getLineNumber(),
                            dFrom.getDepartureTime(),
                            dTo.getDepartureTime(),
                            duration,
                            direction
                    );
                })
                .toList();
    }
}
