package com.leszek.busscheduler.repository;

import com.leszek.busscheduler.domain.Trip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalTime;
import java.util.List;

@Repository
public interface TripRepository extends JpaRepository<Trip, Long> {
    
    @Query("SELECT t FROM Trip t JOIN t.route r JOIN r.routeStops rs WHERE rs.busStop.id = :busStopId")
    List<Trip> findAllTripsByBusStopId(@Param("busStopId") Long busStopId);

    List<Trip> findByRouteId(Long routeId);

        @Query("SELECT dFrom, dTo, dFrom.trip.route.direction FROM Departure dFrom, Departure dTo " +
           "WHERE dFrom.trip = dTo.trip " +
           "AND dFrom.busStop.id = :fromStopId " +
           "AND dTo.busStop.id = :toStopId " +
           "AND dFrom.departureTime >= :startTime " +
           "AND dFrom.departureTime < dTo.departureTime " +
           "ORDER BY dFrom.departureTime ASC")
    List<Object[]> findConnections(@Param("fromStopId") Long fromStopId,
                                   @Param("toStopId") Long toStopId,
                                   @Param("startTime") LocalTime startTime);
}
