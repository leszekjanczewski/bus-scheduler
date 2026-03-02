package com.leszek.busscheduler.controller;

import com.leszek.busscheduler.domain.BusLine;
import com.leszek.busscheduler.domain.User;
import com.leszek.busscheduler.dto.ImportBusLineDTO;
import com.leszek.busscheduler.repository.UserRepository;
import com.leszek.busscheduler.service.BusLineService;
import com.leszek.busscheduler.service.DataImportService;
import com.leszek.busscheduler.repository.BusStopRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminController {

    private final DataImportService dataImportService;
    private final BusLineService busLineService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @PostMapping("/import")
    public void importData(@RequestBody ImportBusLineDTO dto) {
        dataImportService.importBusLine(dto);
    }

    @GetMapping("/lines")
    public List<BusLine> getAllLines() {
        return busLineService.findAllWithRoutes();
    }

    @DeleteMapping("/lines/{id}")
    public ResponseEntity<Void> deleteLine(@PathVariable Long id) {
        if (busLineService.deleteById(id)) return ResponseEntity.ok().build();
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/users")
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @PostMapping("/users")
    public ResponseEntity<?> createUser(@RequestBody User newUser) {
        if (userRepository.findByUsername(newUser.getUsername()).isPresent()) {
            return ResponseEntity.badRequest().body("Użytkownik już istnieje");
        }
        newUser.setPassword(passwordEncoder.encode(newUser.getPassword()));
        return ResponseEntity.ok(userRepository.save(newUser));
    }

    @PutMapping("/users/{id}/password")
    public ResponseEntity<?> changeUserPassword(@PathVariable UUID id, @RequestBody Map<String, String> payload) {
        String newPassword = payload.get("password");
        return userRepository.findById(id)
                .map(user -> {
                    user.setPassword(passwordEncoder.encode(newPassword));
                    userRepository.save(user);
                    return ResponseEntity.ok().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable UUID id) {
        userRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
