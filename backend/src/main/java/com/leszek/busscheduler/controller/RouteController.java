package com.leszek.busscheduler.controller;

import com.leszek.busscheduler.domain.Route;        
import com.leszek.busscheduler.dto.RouteDTO;        
import com.leszek.busscheduler.service.RouteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;     
import org.springframework.web.bind.annotation.*;   

import java.util.List;

@RestController
@RequestMapping("/api/v1/routes")
@RequiredArgsConstructor
public class RouteController {

    private final RouteService routeService;        

    @GetMapping
    public ResponseEntity<List<RouteDTO>> getAllRoutes() {
        List<RouteDTO> routes = routeService.findAll().stream()
                .map(this::convertToDto)
                .toList();
        return ResponseEntity.ok(routes);
    }

    @GetMapping("/{id}")
    public ResponseEntity<RouteDTO> getRouteById(@PathVariable Long id) {
        return routeService.findById(id)
                .map(this::convertToDto)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<RouteDTO> createRoute(@RequestBody RouteDTO routeDTO) {
        try {
            Route createdRoute = routeService.createRoute(routeDTO);
            return new ResponseEntity<>(convertToDto(createdRoute), HttpStatus.CREATED);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<RouteDTO> updateRoute(@PathVariable Long id, @RequestBody RouteDTO routeDTO) {
        return routeService.updateRoute(id, routeDTO)
                .map(this::convertToDto)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRoute(@PathVariable Long id) {
        routeService.deleteRoute(id);
        return ResponseEntity.noContent().build();
    }

    private RouteDTO convertToDto(Route route) {
        return RouteDTO.builder()
                .id(route.getId())
                .variantName(route.getVariantName())
                .direction(route.getDirection())
                .busLineId(route.getBusLine().getId())
                .build();
    }
}
