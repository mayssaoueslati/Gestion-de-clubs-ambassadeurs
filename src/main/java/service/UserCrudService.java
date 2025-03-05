package service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import jakarta.transaction.Transactional;
import model.User;
import repository.UserRepository;

@Service
public class UserCrudService {
	@Autowired
	private   UserRepository userRepository;
	@Autowired
	private   PasswordEncoder passwordEncoder;
	
	public UserCrudService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }
	
	public List<User> getAllUsers(){
		return userRepository.findAll();
		
	}
	  public Optional<User> getUserById(Long id) {
	        return userRepository.findById(id);
	    }
	  @Transactional
	  public User createUser(User user) {
	        // bech encryptiw mdp
	        user.setPassword(passwordEncoder.encode(user.getPassword()));
	        return userRepository.save(user);
	    }
	  public User updateUser(Long id, User updatedUser) {
	        return userRepository.findById(id).map(user -> {
	            user.setName(updatedUser.getName());
	            user.setPrenom(updatedUser.getPrenom());
	            user.setEmail(updatedUser.getEmail());
	            user.setAdresse(updatedUser.getAdresse());
	            user.setCin(updatedUser.getCin());
	            user.setMission(updatedUser.getMission());
	            user.setClub(updatedUser.getClub());
	            user.setPoste(updatedUser.getPoste());
	            user.setTel(updatedUser.getTel());
	            if (!updatedUser.getPassword().isEmpty()) {
	                user.setPassword(passwordEncoder.encode(updatedUser.getPassword()));
	            }

	            return userRepository.save(user);
	        }).orElseThrow(() -> new RuntimeException("User not found"));
	    }
	  public void deleteUser(Long id) {
	        userRepository.deleteById(id);
	    }
	

}
