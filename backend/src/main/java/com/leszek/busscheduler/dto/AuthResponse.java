package com.leszek.busscheduler.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthResponse {
    private String username;
    private Set<String> roles;
    private String message;
    private String token; // Będzie użyte w kolejnym kroku z JWT
}
