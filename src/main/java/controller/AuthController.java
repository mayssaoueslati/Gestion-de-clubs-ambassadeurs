package controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import config.JwtUtil;
import model.User;
import repository.UserRepository;
import service.AuthService;
import java.util.HashMap;
import java.util.Map;
 
@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:4200")
public class AuthController {
    @Autowired
    private AuthService authService;
    
    @Autowired
    private UserRepository userRepo;
    
    @Autowired
    private JwtUtil jwtUtil;
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    static class LoginRequest {
        public String username;
        public String password;
    }
    
    static class RegisterRequest {
        public String name;
        public String email;
        public String password;
        public String role;
    }
    
    @PostMapping("/login")
public ResponseEntity<?> login(@RequestBody LoginRequest request) {
     	System.err.println(request.password);
    	System.err.println(request.username);
    	System.err.println(userRepo.findByName(request.username).isPresent());
    return userRepo.findByName(request.username)
        .map((User userAuth) -> {
            if (passwordEncoder.matches(request.password, userAuth.getPassword())) {
                String role = (userAuth.getRole() != null) 
                    ? userAuth.getRole().name() 
                    : "VISITOR";
                
                String token = jwtUtil.generateToken(userAuth.getUsername(), role);
                Map<String, Object> response = new HashMap<>();
                response.put("token", token);
                response.put("role", role);
                response.put("userId", userAuth.getId());
                response.put("username", userAuth.getUsername());
                return ResponseEntity.ok(response);
            } else {
                return ResponseEntity.status(401).body("Invalid password");
            }
        })
        .orElse(ResponseEntity.status(401).body("User not found"));
}
    @GetMapping("/logout")
    public String logout() {
        return "redirect:/login"; 
    }
    

    
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        try {
            return ResponseEntity.ok(
                authService.registerUser(request.name, request.email, request.password, 
                    request.role != null ? request.role : "VISITOR")
            );
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Registration failed: " + e.getMessage());
        }
    }
}