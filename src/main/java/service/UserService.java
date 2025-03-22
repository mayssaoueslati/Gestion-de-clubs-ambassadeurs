package service;

 
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import model.User;
@Service
public class UserService{
    @Autowired
    private  repository.UserRepository userRepository;
    public List<User> getAllUsers(){
        return userRepository.findAll();
    }
    public User getUserById(Long id){
        return userRepository.findById(id).orElse(null);

    }
    public User createUser(User user){
        return userRepository.save(user);
    }
    public User updateUser(Long id, User userDetails){
        Optional<User> optionalUser=userRepository.findById(id);
        if(optionalUser.isPresent()){
            User user=optionalUser.get();
            user.setName(userDetails.getName());
            user.setEmail(userDetails.getEmail());
            return userRepository.save(user);
        }
        return null;
    }
    public void deleteUser(Long id){
        userRepository.deleteById(id);
    }
    
}