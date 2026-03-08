package com.leszek.busscheduler.repository;

import com.leszek.busscheduler.domain.BusLine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface BusLineRepository extends JpaRepository<BusLine, Long> {
    BusLine findByLineNumber(String lineNumber);

    // Step 1 for list: lines + routes + routeStops + busStop per stop
    @Query("SELECT DISTINCT b FROM BusLine b " +
           "LEFT JOIN FETCH b.routes r " +
           "LEFT JOIN FETCH r.routeStops rs " +
           "LEFT JOIN FETCH rs.busStop")
    List<BusLine> findAllWithRoutesAndStops();

    // Step 2 for list: lines + routes + trips + departures + busStop per departure
    @Query("SELECT DISTINCT b FROM BusLine b " +
           "LEFT JOIN FETCH b.routes r " +
           "LEFT JOIN FETCH r.trips t " +
           "LEFT JOIN FETCH t.departures d " +
           "LEFT JOIN FETCH d.busStop")
    List<BusLine> findAllWithRoutesAndTrips();

    // Step 1 for full detail: routes + routeStops + busStop per stop
    @Query("SELECT DISTINCT b FROM BusLine b " +
           "LEFT JOIN FETCH b.routes r " +
           "LEFT JOIN FETCH r.routeStops rs " +
           "LEFT JOIN FETCH rs.busStop " +
           "WHERE b.id = :id")
    Optional<BusLine> findByIdWithRoutesAndStops(@Param("id") Long id);

    // Step 2 for full detail: routes + trips + departures + busStop per departure
    @Query("SELECT DISTINCT b FROM BusLine b " +
           "LEFT JOIN FETCH b.routes r " +
           "LEFT JOIN FETCH r.trips t " +
           "LEFT JOIN FETCH t.departures d " +
           "LEFT JOIN FETCH d.busStop " +
           "WHERE b.id = :id")
    Optional<BusLine> findByIdWithRoutesAndTrips(@Param("id") Long id);
}
