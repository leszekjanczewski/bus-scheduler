package com.leszek.busscheduler.service;

import com.leszek.busscheduler.domain.Route;
import com.leszek.busscheduler.dto.ConnectionDTO;
import com.leszek.busscheduler.dto.RouteDTO;
import com.leszek.busscheduler.dto.SearchRequest;

import java.util.List;
import java.util.Optional;

public interface RouteService {
    List<Route> findAll();
    Optional<Route> findById(Long id);
    Route createRoute(RouteDTO routeDTO);
    Optional<Route> updateRoute(Long id, RouteDTO routeDTO);
    void deleteRoute(Long id);

    // Search
    List<ConnectionDTO> findConnections(SearchRequest request);
}
