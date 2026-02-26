package com.leszek.busscheduler.controller;

import com.leszek.busscheduler.domain.BusLine;
import com.leszek.busscheduler.dto.BusLineDTO;
import com.leszek.busscheduler.service.BusLineService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/buslines")
@RequiredArgsConstructor
public class BusLineController {

    private final BusLineService busLineService;

    @GetMapping
    public ResponseEntity<List<BusLineDTO>> getAllBusLines() {
        List<BusLineDTO> busLines = busLineService.findAll().stream()
                .map(this::convertToDto)
                .toList();
        return ResponseEntity.ok(busLines);
    }

    @GetMapping("/{id}")
    public ResponseEntity<BusLineDTO> getBusLineById(@PathVariable Long id) {
        return busLineService.findById(id)
                .map(this::convertToDto)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<BusLineDTO> createBusLine(@RequestBody BusLineDTO busLineDTO) {
        BusLine busLine = convertToEntity(busLineDTO);
        BusLine savedBusLine = busLineService.save(busLine);
        return new ResponseEntity<>(convertToDto(savedBusLine), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<BusLineDTO> updateBusLine(@PathVariable Long id, @RequestBody BusLineDTO busLineDTO) {
        return busLineService.findById(id)
                .map(existingBusLine -> {
                    existingBusLine.setLineNumber(busLineDTO.getLineNumber());
                    existingBusLine.setOperator(busLineDTO.getOperator());
                    BusLine updatedBusLine = busLineService.save(existingBusLine);
                    return ResponseEntity.ok(convertToDto(updatedBusLine));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBusLine(@PathVariable Long id) {
        if (busLineService.deleteById(id)) {
            return ResponseEntity.noContent().build();
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    private BusLineDTO convertToDto(BusLine busLine) {
        return BusLineDTO.builder()
                .id(busLine.getId())
                .lineNumber(busLine.getLineNumber())
                .operator(busLine.getOperator())
                .build();
    }

    private BusLine convertToEntity(BusLineDTO busLineDTO) {
        // ID nie jest ustawiane przy tworzeniu nowej encji
        return BusLine.builder()
                .lineNumber(busLineDTO.getLineNumber())
                .operator(busLineDTO.getOperator())
                .build();
    }
}

