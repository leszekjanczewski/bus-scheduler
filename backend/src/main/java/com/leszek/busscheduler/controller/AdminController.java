package com.leszek.busscheduler.controller;

import com.leszek.busscheduler.domain.BusLine;
import com.leszek.busscheduler.domain.BusStop;
import com.leszek.busscheduler.domain.Route;
import com.leszek.busscheduler.domain.RouteStop;
import com.leszek.busscheduler.dto.ImportBusLineDTO;
import com.leszek.busscheduler.service.BusLineService;
import com.leszek.busscheduler.service.DataImportService;      
import com.leszek.busscheduler.repository.BusStopRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final DataImportService dataImportService;
    private final BusLineService busLineService;
    private final BusStopRepository busStopRepository;

    @GetMapping("/test")
    public String adminTest() {
        return "Admin access granted";
    }

    @PostMapping("/import")
    public void importData(@RequestBody ImportBusLineDTO dto) {
        dataImportService.importBusLine(dto);
    }

    @GetMapping("/lines")
    public List<BusLine> getAllLines() {
        return busLineService.findAllWithRoutes();
    }

    @PutMapping("/lines/{id}")
    public ResponseEntity<BusLine> updateLine(@PathVariable Long id, @RequestBody BusLine updatedLine) {
        return busLineService.findById(id)
                .map(existing -> {
                    existing.setLineNumber(updatedLine.getLineNumber());
                    existing.setOperator(updatedLine.getOperator());

                    if (updatedLine.getRoutes() != null && existing.getRoutes() != null) {
                        Map<Long, Route> updatedRoutesMap = updatedLine.getRoutes().stream()
                                .filter(r -> r.getId() != null)
                                .collect(Collectors.toMap(Route::getId, r -> r));

                        for (Route existingRoute : existing.getRoutes()) {
                            Route updatedRouteData = updatedRoutesMap.get(existingRoute.getId());
                            if (updatedRouteData != null) {
                                existingRoute.setVariantName(updatedRouteData.getVariantName());
                                existingRoute.setDirection(updatedRouteData.getDirection());

                                if (updatedRouteData.getRouteStops() != null && existingRoute.getRouteStops() != null) {
                                    Map<Long, RouteStop> updatedStopsMap = updatedRouteData.getRouteStops().stream()
                                            .filter(rs -> rs.getId() != null)
                                            .collect(Collectors.toMap(RouteStop::getId, rs -> rs));

                                    for (RouteStop existingStop : existingRoute.getRouteStops()) {
                                        RouteStop updatedStopData = updatedStopsMap.get(existingStop.getId());
                                        if (updatedStopData != null) {
                                            existingStop.setTimeOffsetMinutes(updatedStopData.getTimeOffsetMinutes());
                                            existingStop.setSequenceNumber(updatedStopData.getSequenceNumber());
                                            
                                            // KLUCZOWA ZMIANA: Możliwość podpięcia innego przystanku
                                            if (updatedStopData.getBusStop() != null && 
                                                !updatedStopData.getBusStop().getId().equals(existingStop.getBusStop().getId())) {
                                                busStopRepository.findById(updatedStopData.getBusStop().getId())
                                                    .ifPresent(existingStop::setBusStop);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    return ResponseEntity.ok(busLineService.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/lines/{id}")
    public ResponseEntity<Void> deleteLine(@PathVariable Long id) {
        if (busLineService.deleteById(id)) return ResponseEntity.ok().build();
        return ResponseEntity.notFound().build();
    }
}
