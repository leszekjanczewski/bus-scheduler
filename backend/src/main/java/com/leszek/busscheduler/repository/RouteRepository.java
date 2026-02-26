package com.leszek.busscheduler.repository;

import com.leszek.busscheduler.domain.Route;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;

@Repository
public interface RouteRepository extends JpaRepository<Route, Long> {
    Optional<Route> findByVariantName(String variantName);
    List<Route> findAllByBusLineId(Long busLineId);
    Optional<Route> findByDirection(String direction);

    // Projection for direct route information between two stops
    interface DirectRouteInfo {
        Long getRouteId();
        String getLineNumber();
        Integer getFromOffset();
        Integer getToOffset();
        String getDirection();
    }

    // Finds routes that contain both stops in the correct order and returns offsets to compute travel time
    @Query("""
            select r.id as routeId,
                   bl.lineNumber as lineNumber,
                   rsFrom.timeOffsetMinutes as fromOffset,
                   rsTo.timeOffsetMinutes as toOffset,
                                      (select s.name 
                    from RouteStop rs 
                    join rs.busStop s 
                    where rs.route = r 
                    order by rs.sequenceNumber desc 
                    limit 1) as direction
            from Route r
            join r.busLine bl
            join RouteStop rsFrom on rsFrom.route = r
            join RouteStop rsTo on rsTo.route = r
            where rsFrom.busStop.id = :fromStopId
              and rsTo.busStop.id = :toStopId
              and rsFrom.sequenceNumber < rsTo.sequenceNumber
            """)
    List<DirectRouteInfo> findDirectRoutes(@Param("fromStopId") Long fromStopId,
                                           @Param("toStopId") Long toStopId);

    @Query("""
            select r.id as routeId,
                   bl.lineNumber as lineNumber,
                   rsFrom.timeOffsetMinutes as fromOffset,
                   rsTo.timeOffsetMinutes as toOffset,
                                      (select s.name 
                    from RouteStop rs 
                    join rs.busStop s 
                    where rs.route = r 
                    order by rs.sequenceNumber desc 
                    limit 1) as direction
            from Route r
            join r.busLine bl
            join RouteStop rsFrom on rsFrom.route = r
            join RouteStop rsTo on rsTo.route = r
            where rsFrom.busStop.name = :fromStopName
              and rsTo.busStop.name = :toStopName
              and rsFrom.sequenceNumber < rsTo.sequenceNumber
            """)
    List<DirectRouteInfo> findDirectRoutesByName(@Param("fromStopName") String fromStopName,
                                                 @Param("toStopName") String toStopName);
    @Query("""
            select distinct r.direction 
            from Route r 
            join RouteStop rs on rs.route = r 
            where rs.busStop.id = :busStopId
            """)
    List<String> findDirectionsByBusStopId(@Param("busStopId") Long busStopId);
}