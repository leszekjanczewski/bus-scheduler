package com.leszek.busscheduler.repository;

import com.leszek.busscheduler.domain.Departure;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;
import java.time.LocalTime;

@Repository
public interface DepartureRepository extends JpaRepository<Departure, Long> {
    Optional<Departure> findByTripId(Long tripId);
    Optional<Departure> findByBusStopId(Long busStopId);

    // Get departures for a route at a specific start stop from a given time
    List<Departure> findByTripRouteIdAndBusStopIdAndDepartureTimeGreaterThanEqualOrderByDepartureTimeAsc(
            Long routeId,
            Long busStopId,
            LocalTime departureTime
    );
    List<Departure> findByBusStopIdAndDepartureTimeGreaterThanEqualOrderByDepartureTimeAsc(Long busStopId, LocalTime departureTime);

}

