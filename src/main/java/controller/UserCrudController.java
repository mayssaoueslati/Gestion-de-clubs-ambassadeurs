package controller;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.annotation.Generated;
import model.User;
import service.UserCrudService;

@CrossOrigin( )
@RestController
@RequestMapping("/api/userCrud")

public class UserCrudController {
	@Autowired

	private   UserCrudService userCrudService;
	public UserCrudController(UserCrudService userCrudService) {
		this.userCrudService= userCrudService;
	}
	@GetMapping
	public ResponseEntity<List<User>> getAllUsers(){
		return ResponseEntity.ok(userCrudService.getAllUsers());
	}
	@GetMapping("/{id}")
	public ResponseEntity<User> getUserById(@PathVariable Long id){
		Optional<User> user = userCrudService.getUserById(id);
		return user.map(ResponseEntity::ok).orElseGet(()-> ResponseEntity.notFound().build());
	}
	
	@PostMapping(value = {"", "/"})  // Handle both endpoints
    public ResponseEntity<User> createUser(@RequestBody User user) {
        System.out.println("Received user: " + user.toString());
        User createdUser = userCrudService.createUser(user);
        return ResponseEntity.ok(createdUser);
    }
	@PutMapping("/{id}")
	public ResponseEntity<User> updateUser(@PathVariable Long id,@RequestBody User updatedUser){
		Optional<User> user = userCrudService.getUserById(id);
		
		return ResponseEntity.ok(userCrudService.updateUser(id,updatedUser));
	}
	@DeleteMapping("/{id}")
	public ResponseEntity<String> deleteUser(@PathVariable Long id){
		userCrudService.deleteUser(id);
		return ResponseEntity.ok("User deleted successfully");
	}
}
