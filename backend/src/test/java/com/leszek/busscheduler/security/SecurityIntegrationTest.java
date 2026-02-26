package com.leszek.busscheduler.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.leszek.busscheduler.dto.LoginRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class SecurityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void shouldLoginSuccessfullyWithValidCredentials() throws Exception {
        LoginRequest loginRequest = new LoginRequest("user", "password");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("user"))
                .andExpect(jsonPath("$.roles").value("ROLE_USER"))
                .andExpect(jsonPath("$.message").value("Login successful"));
    }

    @Test
    void shouldReturn401WhenLoginWithInvalidCredentials() throws Exception {
        LoginRequest loginRequest = new LoginRequest("user", "wrong_password");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "USER")
    void shouldReturn403WhenUserTriesToAccessAdminEndpoint() throws Exception {
        mockMvc.perform(get("/api/admin/test"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void shouldReturn200WhenAdminTriesToAccessAdminEndpoint() throws Exception {
        mockMvc.perform(get("/api/admin/test"))
                .andExpect(status().isOk());
    }

    @Test
    void shouldReturn401WhenUnauthenticatedUserTriesToAccessAdminEndpoint() throws Exception {
        mockMvc.perform(get("/api/admin/test"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void shouldPermitUnauthenticatedUserToAccessSearchEndpoint() throws Exception {
        mockMvc.perform(get("/api/v1/search")
                        .param("from", "Gorzów Dworzec")
                        .param("to", "Kłodawa Urząd Gminy")
                        .param("time", "10:00:00"))
                .andExpect(status().isOk());
    }

    @Test
    void shouldPermitUnauthenticatedUserToAccessSearchEndpointWithShortParameterNames() throws Exception {
        // User's specific case
        mockMvc.perform(get("/api/v1/search")
                        .param("from", "Gorzów Dworzec")
                        .param("to", "Różanki Szkoła")
                        .param("time", "07:00"))
                .andExpect(status().isOk());
    }
}
