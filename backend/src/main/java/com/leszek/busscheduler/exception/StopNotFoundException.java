package com.leszek.busscheduler.exception;

public class StopNotFoundException extends RuntimeException {
    public StopNotFoundException(String message) {
        super(message);
    }
}
