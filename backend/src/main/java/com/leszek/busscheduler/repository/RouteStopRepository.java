package com.leszek.busscheduler.repository;

import com.leszek.busscheduler.domain.RouteStop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RouteStopRepository extends JpaRepository<RouteStop, Long> {
    Optional<RouteStop> findByRouteIdAndBusStopId(Long routeId, Long busStopId);
    Optional<RouteStop> findByBusStopId(Long busStopId);
}

