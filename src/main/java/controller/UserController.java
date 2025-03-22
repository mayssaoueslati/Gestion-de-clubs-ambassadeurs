package controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import model.User;
import model.UserAuth;
import repository.UserAuthRepository;
import service.UserService;
import java.util.List;

@CrossOrigin(origins = "http://localhost:4200")
@RestController
@RequestMapping("/api/users")
public class UserController {
    
    @Autowired
    private UserService userService;
    
    @Autowired
    private UserAuthRepository userAuthRepository;
    
    @GetMapping("/allUsers")
    public List<User> getAllUsers() {
        return userService.getAllUsers();
    }
    
    @GetMapping("/{id}")
    public User getUserById(@PathVariable Long id) {
        return userService.getUserById(id);
    }
    
    @PostMapping("/addUser")
    public User createUser(@RequestBody User user) {
        // No need to encode password here since we're using a separate UserAuth entity
        return userService.createUser(user);
    }
    
    @PutMapping("/{id}")
    public User updateUser(@PathVariable Long id, @RequestBody User userDetails) {
        // Update only user details, not credentials
        return userService.updateUser(id, userDetails);
    }
    
    @DeleteMapping("/{id}")
    public void deleteUser(@PathVariable Long id) {
        // Delete the user (cascade should handle the associated UserAuth)
        userService.deleteUser(id);
    }
}