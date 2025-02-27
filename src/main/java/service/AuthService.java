package service;
  
import model.User;
import model.UserAuth;
import repository.UserRepository;
import repository.UserAuthRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import enums.Role;
import java.util.Optional;

@Service
public class AuthService {
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private UserAuthRepository userAuthRepository;
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    public User registerUser(String username, String email, String password, String role) {
        // Create User entity
        User user = new User();
        user.setName(username);
        user.setEmail(email);
        
        // Create UserAuth entity
        UserAuth userAuth = new UserAuth();
        userAuth.setUsername(username);
        userAuth.setPassword(passwordEncoder.encode(password));
        userAuth.setRole(Role.valueOf(role.toUpperCase()));
        
        // Save User first
        User savedUser = userRepository.save(user);
        
        // Set the relation and save UserAuth
        userAuth.setUser(savedUser);
        UserAuth savedUserAuth = userAuthRepository.save(userAuth);
        
        // Set the auth on the user for response
        savedUser.setUserAuth(savedUserAuth);
        
        return savedUser;
    }
    
    public Optional<UserAuth> findByEmail(String email) {
        return userAuthRepository.findByUserEmail(email); // Ensure UserAuthRepository has this method
    }

}