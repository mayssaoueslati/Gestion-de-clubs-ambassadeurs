package service;
  
import model.User;
import repository.UserRepository;
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
    private PasswordEncoder passwordEncoder;
    
    public User registerUser(String username, String email, String password, String role) {
        User user = new User();
        user.setName(username);
        user.setEmail(email);


        user.setPassword(passwordEncoder.encode(password));
        user.setRole(Role.valueOf(role.toUpperCase()));
        
        User savedUser = userRepository.save(user);
                
        
        return savedUser;
    }

  
}
